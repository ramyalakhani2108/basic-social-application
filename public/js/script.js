const socket = io(); 
    
socket.on('update-likes', (postId, likesCount, likes) => {
    const likeCountElement = document.getElementById(`like-count-${postId}`);
    var post_id = document.getElementById(postId);
    if (likeCountElement) {
        likeCountElement.textContent = `${likesCount} Likes`;
        
        
        if(likes.length > 0) {
            const userIndex = likes.findIndex(like => like === post_id.getAttribute('data-user-id') || like._id === post_id.getAttribute('data-user-id'));
            if(likes){
                if(userIndex!== -1) {
                    post_id.textContent = '♥';
                } else {
                    post_id.textContent = '♡';
                }
            }else{
                post_id.textContent = '♡';
            }
        }else{
            post_id.textContent = '♡';

        }
        
    }
});

socket.on("post-created", (post, user) => {
    const posts = document.querySelector(".post-containers");
    posts.insertAdjacentHTML("beforeend", createPostHTML(post, user));
});


document.querySelectorAll('.toggle-like').forEach((button) => {
    button.addEventListener('click', (e) => {
        const postId = e.target.dataset.postId;
        const userId = e.target.dataset.userId;
        socket.emit('toggle-like', postId, userId); 
    });
});

function toogleLike(element){
    const postId = element.dataset.postId;
    const userId = element.dataset.userId;
    socket.emit('toggle-like', postId, userId); 
}



const form = document.getElementById("post-form");
if(form){
    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent form from submitting the default way
      
        // Capture form data
        const formData = new FormData(form); // Collect data from the form
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value; // Convert FormData to JSON object
        });
      
        // Call the function to send data via socket
        sendDataThroughSocket(data);
      });
}

function sendDataThroughSocket(data) {
  socket.emit("new-post", data); // Send data to the server
}


function createPostHTML(post, user) {
    return `
      <div class="post mb-4 p-4 border-2 rounded-lg border-zinc-700 bg-zinc-800">
        <h4 class="text-blue-500 mb-3">@${user.username}</h4>
        <p class="tracking-tight text-sm line-clamp-3 overflow-hidden text-ellipsis">${post.content}</p>
        <small class="inline-block font-bold mt-3" id="like-count-${post._id}">${post.likes.length} Likes</small>
        <div class="btns flex mt-2 gap-2">
          <a href="javascript:void(0)" onclick='toogleLike(this)' id="${post._id}" class="toggle-like text-red-500 text-lg" data-post-id="${post._id}" data-user-id="${user._id}">
            ${post.likes.findIndex(like => like.equals(user._id)) === -1 ? '♡' : '♥'}
          </a>
          ${user.email === post.user.email ? `<a href="/edit/post/${post._id}" class="text-zinc-600">Edit</a>` : ""}
        </div>
      </div>
    `;
  }

function deletePost(element){
    const postId = element.dataset.postId;
    const userId = element.dataset.userId;

    socket.emit('delete-post', postId, userId); 

    // element.parentElement.parentElement.remove();
}

socket.on('deleted-post', (postId)=>{
    const post = document.getElementById(postId);
    post.parentElement.parentElement.remove();
});