const express = require('express');
const app = express();

const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://iamshadankhan_user:Samsung123@cluster1.1wggcbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1');

const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const path = require('path');
const upload = require('./config/multerconfig');

//Middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());




app.get('/', (req, res) => {
    res.render('index');
});

app.get('/create', (req, res) => {
    res.render('login');
});

app.get('/test', (req, res) => {
    res.render('test');
});

app.get('/profile/upload', (req, res) => {
    res.render('profileupload');
});

app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    let user = await userModel.findOne({email : req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
});



app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts") ;
    res.render('profile', { user });
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  const userId = req.user.userid;
  const alreadyLiked = post.likes.some(like => like.toString() === userId);

  if (alreadyLiked) {
    post.likes = post.likes.filter(like => like.toString() !== userId);
  } else {
    post.likes.push(userId);
  }

  await post.save();
  res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findById(req.params.id);

  res.render("edit", {post});
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content} );

  res.redirect("/profile");
});


app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    let { content } = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});


app.post('/register', async (req, res) => {
  try {
    const { username, name, age, email, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !name || !age || !email || !password) {
      return res.status(400).send("All fields are required");
    }

    // 2️⃣ Check for existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    // 3️⃣ Hash password securely
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 4️⃣ Create new user
    const user = await userModel.create({
      username,
      name,
      age,
      email,
      password: hash
    });

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { email: user.email, userid: user._id },
      "secretkey"
    );

    // 6️⃣ Set cookie and redirect
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
    });

    res.redirect('/profile'); // ✅ redirect only once
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/login', async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

    let user = await userModel.findOne({email});
    if(!user){
        return res.status(400).send("User does not exist");
    }
    bcrypt.compare(password, user.password, (err, result) => {
        if(result) {
            let token = jwt.sign({email: email, userid: user._id},"secretkey");
            res.cookie("token", token);
            res.redirect('/profile');
            
        }
        else {
            return res.status(400).send("Wrong password");
        } 
    })
});

app.get('/logout', (req, res) => {
    res.clearCookie('token', '');
    res.redirect('/');
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;  // cookie-parser ensures this exists if cookie is set

  // Case 1: no token cookie at all OR empty
  if (!token) {
    return res.status(400).send("Login required");

  }

  try {
    // Case 2: token exists → verify it
    const data = jwt.verify(token, "secretkey");
    req.user = data; // attach decoded user to request
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    // Invalid/expired token → clear cookie & redirect
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

app.listen(3000);