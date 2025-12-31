// frontend/src/components/features/profile/FollowRequestInbox.jsx

import React, { useState, useEffect } from 'react';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPersonOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import Avatar from '../../common/Avatar';
import { getFollowRequests, handleFollowRequestAction } from '../../../api/userApi';

/**
 * Lists pending follow requests for the current user and allows them to be accepted or rejected.
 */
const FollowRequestInbox = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // --- Fetch Requests ---
  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFollowRequests();
      setRequests(data);
    } catch (e) {
      setError('Failed to load follow requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- Action Handler (Accept/Reject) ---
  const handleAction = async (requestId, action) => {
    setProcessingId(requestId);
    try {
      await handleFollowRequestAction(requestId, action);

      // Optimistically remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId));

    } catch (e) {
      alert(`Failed to ${action} request. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  // --- Render ---
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-text-primary">
        Follow Requests ({requests.length})
      </h2>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-text-secondary border border-border rounded-xl">
          <IoPersonOutline className="h-12 w-12 mx-auto mb-3" />
          <p className='font-medium'>No pending follow requests right now.</p>
        </div>
      ) : (
        <div className='card p-4 space-y-3'>
          {requests.map(request => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 border-b border-border/50 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <Avatar src={request.sender_profile_pic} size="md" />
                <div>
                  <Link to={`/profile/${request.sender_username}`} className="font-semibold text-text-primary hover:text-text-accent">
                    {request.sender_username}
                  </Link>
                  <p className="text-sm text-text-secondary">
                    Requested follow
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(request.id, 'accept')}
                  disabled={processingId !== null}
                  leftIcon={processingId === request.id ? <Spinner size="sm" /> : <IoCheckmarkCircleOutline />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === request.id ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(request.id, 'reject')}
                  disabled={processingId !== null}
                  leftIcon={<IoCloseCircleOutline />}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowRequestInbox;