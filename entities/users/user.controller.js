import { PrimateService, PrimateController } from '@thewebchimp/primate';
import UserService from '#entities/users/user.service.js';
import queryString from 'query-string';

class UserController extends PrimateController {

	/**
	 * Retrieves the authenticated user's information.
	 *
	 * This method checks for the presence of an authenticated user in the request object.
	 * If the user is authenticated, it fetches the user data from the database, removes
	 * the password for security, and sends the user data in the response. If the user is
	 * not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {void}
	 */
	static async me(req, res) {
		try {
			if(!req.user || !req.user.payload || !req.user.payload.id) {
				return res.respond({ status: 401, message: 'Unauthorized' });
			}

			// Get user from req
			const signedUser = req.user.payload;

			/** @type {User} */
			const user = await PrimateService.findById('user', signedUser.id);

			if(!user) {
				return res.respond({ status: 404, message: 'User not found' });
			}

			// delete password
			delete user.password;

			return res.respond({
				data: user,
				message: 'User retrieved successfully',
			});

		} catch(e) {
			console.error(e);
			return res.respond({ status: 400, message: 'User me error: ' + e.message });
		}
	};

	/**
	 * Registers a new user.
	 *
	 * This method handles the registration of a new user. It receives user details from the request body,
	 * attempts to create a new user with these details, and logs the event if the user creating the request
	 * is already authenticated. It responds with the newly created user data or an error message if the
	 * registration fails due to validation errors or if the username already exists.
	 *
	 * @param {Object} req - The request object containing user details in the body.
	 * @param {Object} res - The response object used to send back the created user data or error message.
	 * @returns {void}
	 */
	static async register(req, res) {
		try {
			delete req.body.passwordConfirmation;

			/** @type {User} */
			const user = await UserService.create(req.body);

			return res.respond({
				data: user,
				message: 'User created successfully',
			});

		} catch(e) {
			let message = 'Error creating user: ' + e.message;

			if(e.code === 'P2002') {
				message = 'Error creating user: Username already exists';
			}

			return res.respond({
				status: 400,
				message,
			});
		}
	};

	/**
	 * Logs in a user.
	 *
	 * This method authenticates a user by their username and password. It first validates the provided credentials,
	 * then checks if the user exists and if the password matches the stored hash. If authentication is successful,
	 * it generates an access token for the user, resolves their permissions based on their user type, and returns
	 * the user data along with the access token. If the user does not exist, or if the password does not match,
	 * it responds with an error message.
	 *
	 * @param {Object} req - The request object containing login credentials in the body.
	 * @param {Object} res - The response object used to send back the user data with access token or error message.
	 * @returns {void}
	 */
	static async login(req, res) {
		try {
			const { user, accessToken } = await UserService.login(req.body);

			return res.respond({
				data: user,
				message: 'Account login successful',
				props: { accessToken },
			});

		} catch(e) {
			console.error(e);
			return res.respond({
				status: 400,
				message: 'Error login user: ' + e.message,
			});
		}
	};

	/**
	 * Returns the avatar image for a user if it exists, or generates an avatar based on the user's first name and last name.
	 *
	 * This method retrieves the user's avatar from the database if it exists. If the avatar does not exist, it generates
	 * an avatar using the user's initials and returns it. The method also supports query parameters for customizing the
	 * avatar's appearance, such as size, width, height, boldness, background color, text color, font size, border, and
	 * the number of characters to display.
	 *
	 * @param {Object} req - The request object containing the user ID in the parameters and optional query parameters for avatar customization.
	 * @param {Object} res - The response object used to send back the avatar image or redirect to the generated avatar URL.
	 * @returns {void}
	 * @throws {Error} - Throws an error if the user ID is not provided or if there is an issue retrieving the user or avatar.
	 */
	static async avatar(req, res) {

		if(!req.params.id) throw new Error('No user id provided');

		// Get query params for width and height
		const {
			size = 128,
			width = 128,
			height = 128,
			bold = true,
			background = 'FFFFFF',
			color = '000000',
			fontSize = 64,
			border = 2,
			chars = 2,
			mode = 'light',
		} = req.query;

		// Set options
		const options = { size, width, height, bold, background, color, fontSize, border, chars };

		if(mode === 'dark') {
			options.background = '000000';
			options.color = 'FFFFFF';
		}

		// covert options to query string
		const query = queryString.stringify(options);

		try {

			/** @type {User} */
			const user = await PrimateService.findById('user', req.params.id);
			let attachment;

			// check if we got user.metas.idAvatar
			if(user.metas?.idAvatar) {
				// get the attachment
				try {

					/** @type {Attachment} */
					attachment = await PrimateService.findById('attachment', user.metas.idAvatar);

				} catch(e) {
					console.error('Error getting attachment:', e);
				}
			}

			// if we have an attachment, return the location of the attachment
			if(attachment && attachment.metas?.location) {

				res.redirect(attachment.metas.location);

			} else {

				// Get initials
				let initials = user.firstname + ' ' + user.lastname;

				// Trim initials
				initials = initials.trim();

				// if the initials are empty, use username
				if(!initials) initials = user.username;

				// if still empty, use NA
				if(!initials) initials = 'NA';

				res.redirect(`https://ui-avatars.com/api/?name=${ initials }&${ query }`);
			}
		} catch(e) {

			console.error('Error getting avatar, using fallback:', e);
			res.redirect(`https://ui-avatars.com/api/?name=NA&${ query }`);
		}
	};

	static async connect(req, res) {
		try {
			const idNear = req.body.idNear;
			if(!idNear) return res.respond({ status: 400, message: 'Missing idNear' });

			// check if there is a users with the near id
			let user = await PrimateService.findBy('user', { idNear });

			// No user, create it
			if(!user) {

				user = await UserService.create({
					idNear: idNear
				});
			}

			return res.respond({
				data: user,
				message: 'User connected successfully',
			});

		} catch(e) {
			console.error(e);
			return res.respond({ status: 400, message: 'User me error: ' + e.message });
		}
	}
}

export default UserController;