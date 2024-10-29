/**
 * @typedef {Object} User
 * The user object represents a registered user in the system.
 * @property {number} [id] - The user's unique ID.
 * @property {string} [uid] - The user's GUID.
 * @property {string} [username] - The user's login username, must be a valid email.
 * @property {string} email - The user's email, must be a valid email.
 * @property {string} firstname - The user's first name, required.
 * @property {string} lastname - The user's last name, required.
 * @property {string} [nicename=''] - The user's nice name, optional and defaults to an empty string.
 * @property {string} [password=''] - The user's password, optional and can be an empty string.
 * @property {string} [type='User'] - The type of the user, defaults to 'User'.
 * @property {string} [status='Active'] - The user's status, defaults to 'Active'.
 * @property {string} [language='en'] - The user's language, defaults to 'en'.
 * @property {UserMetas} [metas={}] - Additional metadata associated with the user, defaults to an empty object.
 * @property {string} [login] - An alternative to 'email' for logging in (either 'login' or 'email' is required).
 */

/**
 * @typedef {Object} UserMetas - Additional metadata associated with a user.
 * @property {number} idAvatar - The ID of the user's avatar.
 */

/**
 * @typedef {Object} Attachment
 * @property {number} id - Unique identifier for the attachment.
 * @property {string} slug - Unique slug for the attachment.
 * @property {string} name - Name of the attachment, defaults to an empty string.
 * @property {string} attachment - The attachment itself (e.g., file path or URL), defaults to an empty string.
 * @property {string} mime - MIME type of the attachment, defaults to an empty string.
 * @property {number} size - Size of the attachment in bytes, defaults to 0.
 * @property {string} source - Source of the attachment, defaults to an empty string.
 * @property {string} acl - Access control list (permissions), defaults to an empty string.
 * @property {AttachmentMetas} metas - Additional metadata associated with the attachment.
 * @property {Date} created - Date and time when the attachment was created, defaults to the current time.
 * @property {Date} modified - Date and time when the attachment was last modified, defaults to the current time.
 */

/**
 * @typedef {Object} AttachmentMetas - Additional metadata associated with an attachment.
 * @property {string} location - Location of the attachment.
 */