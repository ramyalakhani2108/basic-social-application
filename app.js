const express = require('express');
const userModel = require('./models/user');
const cookieParser = require('cookie-parser');
const postModel = require('./models/post');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const upload = require('./config/multerconfig');
const app = express();
const http = require('http')
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);



app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser());

//this is how the crypto works 
// crypto.randomBytes(10, (err, buf) => {
//     console.log(buf.toString('hex'));
//     })


io.on('connection', (socket) => {
    console.log('A user connected');
  
    socket.on('toggle-like', async (postId, userId) => {    
        try {
            let post = await postModel.findById(postId).populate('likes');
            const userIndex = post.likes.findIndex(like => like._id.toString() === userId);

            if (userIndex === -1) {
               
                post.likes.push(userId);
            } else {
              
                post.likes.splice(userIndex, 1);
            }

         
            await post.save();

            io.emit('update-likes', postId,  post.likes.length, post.likes);
        } catch (error) {
            console.error('Error handling like/dislike:', error);
        }
    });

    socket.on('new-post', async (data) => {
        const { content, userId } = data;
        console.log(content, userId);
        let user = await userModel.findOne({_id: userId});

        //saving post with user's id
        let post = await postModel.create({
            user: user._id,
            content
        });
    

        

        //saving post id to user
        user.posts.push(post._id);
        await user.save();
        io.emit('post-created', post,user);
    });

    socket.on('delete-post', async (postId, userId) => {
        const post = await postModel.findById(postId);
        const user = await userModel.findById(userId);
        if(post){
            await postModel.findOneAndDelete({_id: post._id});
            await user.posts.splice(post._id, 1);
            await user.save();

            io.emit('deleted-post', postId);

        }
    })

  
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

app.get('/register', (req, res) => {
    res.render('register')
});


app.post('/profile/upload',isLoggedIn, upload.single('profile_img'), async (req, res) => {
    let user = await userModel.findOneAndUpdate({_id:req.user.userid}, {profile: req.file.filename},{new:true});
    res.redirect('/profile');
})


app.get('/delete/post/:postid',isLoggedIn, async (req,res)=> {
    let user = await userModel.findOne({_id: req.user.userid});
    let post = await postModel.findOneAndDelete({_id: req.params.postid});

    user.posts.splice(user.posts.indexOf(post._id), 1);
    await user.save(); //saving the changes
    res.redirect(req.get('Referer')); //redirecting back to profile page
});
app.get('/', isLoggedIn, async (req, res) => {

    let loginuser = await userModel.findOne({_id: req.user.userid});
    let user = await userModel.findOne({_id: req.user.userid});
    let posts = await postModel.find().populate('user').populate('likes');

     
    res.render('index', {user,posts, loginuser})
})
//registering the users
app.post('/register', async (req, res) => {
    const {email, password, username, age, name} = req.body
    
    let user = await userModel.findOne({email: email});
    if(user){
        return res.status(500).send("user already exists");
    }

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            user = await userModel.create({
                username,
                email,
                password:hash,
                name,
                age
            });

            //sending jwt to the client
            let token = jwt.sign({email: email,userid:user._id},'secretkey'); //it is not async 
            res.cookie('token', token);

            res.redirect('/login')
        });
    })



})


//rendering the login page
app.get('/login', (req, res) => {
    res.render('login')
});

//protected route
app.get('/profile',isLoggedIn, async (req,res)=>{

    let loginuser = await userModel.findOne({_id: req.user.userid});
    let user = await   userModel.findOne({_id: req.user.userid}).populate('posts');
    res.render('profile', {user, loginuser});
})

app.get('/profile/:id', isLoggedIn, async (req, res)=>{
    let loginuser = await userModel.findOne({_id: req.user.userid});
    let user = await   userModel.findOne({_id: req.params.id}).populate('posts');
    res.render('userprofile', {user, loginuser});
})

app.post('/post',isLoggedIn, async (req,res)=>{
    let {content} = req.body; 
    //getting user data
    let user = await userModel.findOne({_id: req.user.userid});

    //saving post with user's id
    let post = await postModel.create({
        user: user._id,
        content
    });

    //saving post id to user
    user.posts.push(post._id);
    await user.save();

    res.redirect('/profile');



})

app.post('/login', async(req, res) => {
     
    //getting the email and password 
    const {email, password} = req.body;

    //finding the user in the database
    let user = await userModel.findOne({email: email});
    if(!user) return res.send('Something went wrong');

    //comparing the password
    bcrypt.compare(password, user.password, (err, result) => {
        if(err) return res.send('Something went wrong');
        if(result){
            let token = jwt.sign({email: email,userid:user._id},'secretkey');
            res.cookie('token', token);
            res.status(200).redirect('/profile');
        }else{
            return res.redirect('/login');
        }
    })
})

app.get('/like/post/:postid', isLoggedIn,async (req, res) => {
    let post = await  postModel.findOne({_id: req.params.postid});
    var index = post.likes.indexOf(req.user.userid);
    //check if the user is already liked the post or not 
    if(index === -1) { //if user has not liked the post then it will return -1 
        post.likes.push(req.user.userid); 
    }else{
        post.likes.splice(index, 1); //it will remove the user from the likes array
    }
    await post.save(); //saving the changes 
    const referer = req.get('Referer'); // Get the URL of the referring page

    if (referer) {
        res.redirect(referer); // Redirect back to the referring page
    } else {
        res.redirect('/'); // Fallback: Redirect to home if no referer is set
    }
})

app.get('/edit/post/:postid', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.postid});
    res.render('edit', {post});
})

app.post('/update/post/', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.body.id},{content: req.body.content},{new: true});
    res.redirect('/profile');
})

app.post('/create', (req, res) => {
    res.send('hey')
});

app.post('/logout', (req,res)=>{
    res.clearCookie('token');
    res.redirect('/')
})

// 404 handler: Redirects to a custom page (e.g., a "Not Found" page)
// This should be placed after all your route definitions.
app.use((req, res) => {
    res.render('404'); // Redirect to a custom 'Not Found' page
});


// Alternatively, if you want to render an error page instead of a redirect:

//creating middleware for checking user is logged in or not, and it helps us to create protected route
function isLoggedIn(req,res,next){
    if(! req.cookies.token) return res.redirect('/login');
    let data = jwt.verify(req.cookies.token, "secretkey"); //if the token is correct it will give the decoded data of the user available inside the token
    req.user = data; //this helps to setup data to use it every protected route and get essential data
    next();
}



server.listen(3002);