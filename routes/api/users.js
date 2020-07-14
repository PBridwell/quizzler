const Card = require('../../models/Card');
const User = require('../../models/User');
const Deck = require('../../models/Deck');
require('dotenv').config();

const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
module.exports = (app) => {
	// @ /api/users
	// GET all users

	//@ api/users/register
	// register ONE user
	app.post('/api/users/register', async (req, res) => {
		try {
			let { email, password, passwordcheck, displayName } = req.body;
			// validationkl
			if (!email || !password || !passwordcheck)
				return res.status(400).json({ msg: 'please fill out required fields' });
			if (password.length < 5)
				return res
					.status(400)
					.json({ msg: 'Password must be at least 5 characters long' });
			if (password !== passwordcheck)
				return res.status(400).json({ msg: 'Your passwords do not match' });
			const existingUser = await User.findOne({ email: email });
			if (existingUser)
				return res
					.status(400)
					.json({ msg: 'An account already exists for this email' });
			if (!displayName) displayName = email;
			const salt = await bcrypt.genSalt(10);
			const passwordHash = await bcrypt.hash(password, salt);

			const newUser = new User({
				email,
				password: passwordHash,
				displayName,
			});
			const savedUser = await newUser.save();
			res.json(savedUser);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});
	// @ /api/users/login
	// LOGIN one created user
	app.post('/api/users/login', async (req, res) => {
		console.log('hit');
		try {
			const { email, password } = req.body;
			// validation
			if (!email || !password)
				return res.status(400).json({ msg: 'please fill out required fields' });
			const user = await User.findOne({ email });
			if (!user)
				return res
					.status(400)
					.json({ msg: 'an account with this email does not exist' });
			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch)
				return res
					.status(400)
					.json({ msg: 'The email or password you entered is incorrect' });
			// token is associated with user id that is generated by mongo (_id)
			const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
			res.json({
				token: token,
				user: { id: user._id, displayName: user.displayName },
			});
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});
	// DELETE route
	app.delete('/api/users/delete', auth, async (req, res) => {
		console.log(req.user);
		try {
			const deletedUser = await User.findByIdAndDelete(req.user);
			res.json(deletedUser);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});
	// check for valid token
	app.post('/api/users/tokenIsValid', async (req, res) => {
		try {
			const token = req.header('x-auth-token');
			if (!token) return res.json(false);
			const verified = jwt.verify(token, process.env.JWT_SECRET);
			if (!verified) return res.json(false);
			const user = await User.findById(verified.id);
			if (!user) return res.json(false);
			return res.json(true);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	// find ONE user
	app.get('/api/users', auth, async (req, res) => {
		const user = await User.findById(req.user);
		res.json(user);
	});

	// Route for creating new deck
	app.post('/api/deck', auth, (req, res) => {
		Deck.create({
			name: req.body.name,
			descr: req.body.descr,
			userID: req.user,
			cards: [],
		})
			.then((deck) => res.json(deck))
			.catch((err) => console.log(err));
	});

	// Route for creating new card
	app.post('/api/card/:deck', auth, (req, res) => {
		Card.create({
			keyWord: req.body.keyWord,
			definition: req.body.definition,
			deckID: req.params.deck,
		})
			.then((card) => res.json(card))
			.catch((err) => console.log(err));
	});

	// Route for finding all cards for a deck
	app.get('/api/cards/:deck', auth, (req, res) => {
		Card.find({
			deckID: req.params.deck,
		})
			.then((cards) => res.json(cards))
			.catch((err) => console.log(err));
	});

	// find all decks associated with logged in user
	// will use this in Useeffect on homepage to render decks
	app.get('/api/user/decks', auth, (req, res) => {
		Deck.find({
			userID: req.user,
		})
			.then((deck) => res.json(deck))
			.catch((err) => console.log(err));
	});
};
