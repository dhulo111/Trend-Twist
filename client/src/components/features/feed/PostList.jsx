// frontend/src/components/features/feed/PostList.jsx

import React from 'react';
import Post from './Post'; // Assuming Post.jsx is in the same directory

import Spinner from '../../common/Spinner';

const PostList = ({ posts, onUpdateFeed, lastPostElementRef, loadingMore }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <h3 className="text-xl font-bold text-text-primary">No Posts Yet</h3>
        <p className="mt-2">Follow more users or create your first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-20">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          onUpdate={onUpdateFeed} // Pass the refresh function down
        />
      ))}
      <div ref={lastPostElementRef} className="h-4"></div>
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Spinner size="md" />
        </div>
      )}
    </div>
  );
};

export default PostList;