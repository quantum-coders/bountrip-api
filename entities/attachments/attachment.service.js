import primate from '@thewebchimp/primate';

import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import mime from 'mime-types';
import {v4 as uuidv4} from 'uuid';
import slugify from 'slugify';

const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);

const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: process.env.SPACES_KEY,
	secretAccessKey: process.env.SPACES_SECRET,
});

class AttachmentService {
	/**
	 * @function findById
	 * @description Retrieves an attachment by its unique identifier.
	 * @param {string|number} id - The unique identifier of the attachment.
	 * @returns {Promise<Attachment>} - Returns a promise that resolves to the attachment object if found, or null if not found.
	 * @throws {Error} - Throws an error if something goes wrong during the retrieval process.
	 */
	static findById(id) {
		try {
			return primate.prisma.attachment.findUnique({
				where: {id: parseInt(id)},
			});
		} catch (e) {
			console.error(e);
			throw e;
		}
	}

	/**
	 * @function getUrl
	 * @description Generates a URL for accessing an attachment, either a public URL or a signed URL if the attachment is private.
	 * @param {Attachment} attachment - The attachment object.
	 * @returns {string} - Returns the URL for accessing the attachment.
	 */
	static getUrl(attachment) {

		let url;

		if (attachment.acl === 'public-read') {

			url = attachment.metas.location;

		} else {

			url = s3.getSignedUrl('getObject', {
				Bucket: process.env.SPACES_BUCKET_NAME,
				Key: attachment.attachment,
				Expires: 60 * 60 * 24 * 7, // 7 days
			});
		}

		return url;
	}

	/**
	 * @function uploadFile
	 * @description Uploads a file to the specified S3 bucket.
	 * @param {string} filePath - The path to the file to be uploaded.
	 * @returns {Promise<string>} - Returns a promise that resolves to the URL of the uploaded file.
	 * @throws {Error} - Throws an error if something goes wrong during the upload process.
	 */
	static async uploadFile(filePath) {

		const fileContent = fs.readFileSync(filePath);

		//get the file name from the filePath
		const fileName = path.basename(filePath);

		//const mimeType = 'application/pdf';
		const mimeType = mime.lookup(filePath);
		const acl = 'public-read';
		// The file should go to /upload/[year]/[month]/[filename]

		const date = new Date();
		const year = date.getFullYear();
		let month = date.getMonth() + 1;

		// add padded zero to month
		if (month < 10) month = '0' + month;

		const params = {
			Bucket: process.env.SPACES_BUCKET_NAME,
			Key: `upload/${year}/${month}/${fileName}`, // Set the desired key (path) in your S3 bucket
			Body: fileContent,
			ACL: acl,
			ContentType: mimeType,
		};

		try {
			const uploadResponse = await s3.upload(params).promise();
			console.info('File uploaded successfully:', uploadResponse.Location);
			return uploadResponse.Location;
		} catch (error) {
			console.error('Error uploading file:', error);
		}
	}

	/**
	 * @function createAttachment
	 * @description Uploads a file to the specified S3 bucket and creates an attachment record in the database.
	 * @param {Object} file - The file object to be uploaded.
	 * @param {string} file.mimetype - The MIME type of the file.
	 * @param {string} file.originalname - The original name of the file.
	 * @param {number} file.size - The size of the file in bytes.
	 * @param {Buffer} file.buffer - The buffer containing the file data.
	 * @param {Object} [params={}] - Additional parameters for the attachment.
	 * @param {string} [params.acl='public-read'] - The access control list setting for the file (e.g., 'public-read').
	 * @returns {Promise<CreateAttachmentResponse>} - Returns a promise that resolves to an object containing the attachment and upload data.
	 * @throws {Error} - Throws an error if something goes wrong during the upload or database operation.
	 */

	/**
	 * @typedef {Object} CreateAttachmentResponse
	 * @property {Attachment} attachment - The created attachment object.
	 * @property {SendData} data - The upload data object.
	 */

	static async createAttachment(file, params = {}) {
		try {

			// get the mime type of file
			const mimeType = file.mimetype;
			const acl = params.acl || 'public-read';

			// The file should go to /upload/[year]/[month]/[filename]
			const date = new Date();
			const year = date.getFullYear();
			let month = date.getMonth() + 1;

			// add padded zero to month
			if (month < 10) month = '0' + month;

			// append uuid to file original name
			const uuid = uuidv4();
			let filename = `${uuid}-${file.originalname}`;

			// slugify filename
			filename = slugify(filename, {lower: true});

			const fileBuffer = file.buffer;

			const s3Params = {
				Bucket: process.env.SPACES_BUCKET_NAME,
				Key: `upload/${year}/${month}/${filename}`,
				Body: file.buffer,
				ACL: acl,
				ContentType: mimeType,
			};

			// s3 upload with await
			const data = await s3.upload(s3Params).promise();

			// Create attachment in database
			/** @type {Attachment} */
			const attachment = await primate.prisma.attachment.create({
				data: {
					name: file.originalname,
					slug: filename,
					attachment: `upload/${year}/${month}/${filename}`,
					mime: mimeType,
					size: file.size,
					source: 'digitalocean',
					acl: acl,
					metas: {
						location: data.Location,
					},
				},
			});

			return {
				attachment,
				data,
			};

		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function createAttachmentFromLocalFile
	 * @description Uploads a local file to the specified S3 bucket and creates an attachment record in the database.
	 * @param {string} file - The path to the local file to be uploaded.
	 * @param {Object} [params={}] - Additional parameters for the attachment.
	 * @param {string} [params.acl='public-read'] - The access control list setting for the file (e.g., 'public-read').
	 * @returns {Promise<CreateAttachmentResponse>} - Returns a promise that resolves to an object containing the attachment and upload data.
	 * @throws {Error} - Throws an error if something goes wrong during the upload or database operation.
	 */
	static async createAttachmentFromLocalFile(file, params = {}) {
		try {

			// get the name from the file path
			const name = file.split('/').pop();

			// get the size of the file
			const stats = fs.statSync(file);

			const fileObj = {
				mimetype: mime.lookup(file),
				originalname: name,
				size: stats.size,
				buffer: fs.readFileSync(file),
			};

			return AttachmentService.createAttachment(fileObj, params);

		} catch (error) {
			throw error;
		}
	}
}

export default AttachmentService;
