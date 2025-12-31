// frontend/src/components/features/feed/PostList.jsx

import React from 'react';
import Post from './Post'; // Assuming Post.jsx is in the same directory

const PostList = ({ posts, onUpdateFeed }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <h3 className="text-xl font-bold text-text-primary">No Posts Yet</h3>
        <p className="mt-2">Follow more users or create your first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          onUpdate={onUpdateFeed} // Pass the refresh function down
        />
      ))}
    </div>
  );
};

export default PostList;