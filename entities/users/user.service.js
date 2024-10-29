import primate, { jwt, PrimateService } from '@thewebchimp/primate';
import bcrypt from 'bcrypt';

class UserService {

	/**
	 * Creates a new user with the given data.
	 *
	 * @param {Object} data - The data for the new user.
	 * @returns {Promise<Object>} - A promise that resolves to the created user object.
	 */
	static async create(data) {
		try {
			// Business Logic

			if(data.password) data.password = bcrypt.hashSync(data.password, 8);

			// if we receive username or email, we use one as the other
			if(data.username && !data.email) data.email = data.username;
			else if(data.email && !data.username) data.username = data.email;

			// If we receive firstname or lastname, we use them to create nicename
			if(data.firstname && data.lastname) data.nicename = data.firstname + ' ' + data.lastname;

			// Primate Create
			return PrimateService.create('user', data);
		} catch(e) {
			throw e;
		}
	}

	/**
	 * Updates a user with the given data.
	 *
	 * @param {number} id - The ID of the user to update.
	 * @param {Object} data - The data to update the user with.
	 * @param {Object} [options={}] - Additional options for updating the user.
	 * @returns {Promise<Object>} - A promise that resolves to the updated user object.
	 */
	static async update(id, data, options = {}) {

		if(data.password) data.password = bcrypt.hashSync(data.password, 8);
		else delete data.password;

		return PrimateService.update('user', id, data);
	}

	/**
	 * @typedef {Object} UserLoginResponse
	 * @property {User} user - The logged-in user object.
	 * @property {string} accessToken - The access token for the user.
	 */

	/**
	 * Logs in a user with the given data.
	 *
	 * @param {Object} data - The login data containing username and password.
	 * @returns {Promise<UserLoginResponse>} - A promise that resolves to the logged-in user object with an access token.
	 * @throws {Error} - Throws an error if the login or password is missing, or if the user is not found or unauthorized.
	 */
	static async login(data) {
		const { username, password } = data;

		if(!username || !password) throw Error('Missing login or password');

		/** @type {User} */
		const user = await primate.prisma.user.findUnique({
			where: { username },
		});

		if(!user) throw Error('User not registered');

		// Check user is active
		if(user.status !== 'Active') throw Error('User is not active');

		const checkPassword = bcrypt.compareSync(password, user.password);
		if(!checkPassword) throw Error('Email address or password not valid');
		delete user.password;

		const accessToken = await jwt.signAccessToken(user);

		return { user, accessToken };
	}
}

export default UserService;
