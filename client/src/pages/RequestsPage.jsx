// frontend/src/pages/RequestsPage.jsx

import React from 'react';
import FollowRequestInbox from '../components/features/profile/FollowRequestInbox';
import { IoPersonAddOutline } from 'react-icons/io5';

/**
 * Full page dedicated to displaying and managing pending follow requests.
 * Accessible via /requests route.
 */
const RequestsPage = () => {
  return (
    <div className="mx-auto max-w-4xl pb-12 pt-4">

      {/* --- Header --- */}
      <div className="flex items-center space-x-3 mb-6 border-b border-border pb-3">
        <IoPersonAddOutline className="h-8 w-8 text-text-accent" />
        <h1 className="text-3xl font-bold text-text-primary">
          Follow Requests Inbox
        </h1>
      </div>

      {/* --- Main Inbox Component --- */}
      <div className="rounded-xl card shadow-lg p-6">
        <FollowRequestInbox />
      </div>
    </div>
  );
};

export default RequestsPage;