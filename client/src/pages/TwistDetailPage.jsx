// frontend/src/pages/TwistDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Spinner from '../components/common/Spinner';
import TwistCard from '../components/features/feed/TwistCard';
import TwistCommentSection from '../components/features/feed/TwistCommentSection';

import { IoArrowBackOutline } from 'react-icons/io5';
import Button from '../components/common/Button';

const TwistDetailPage = () => {
  const { twistId } = useParams();
  const navigate = useNavigate();

  const [twist, setTwist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTwist = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/twists/${twistId}/`);
      setTwist(response.data);
    } catch (err) {
      setError('Failed to load twist. It may have been deleted.');
      console.error('Twist detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwist();
  }, [twistId]);

  if (loading) {
    return <div className="flex justify-center pt-24"><Spinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="card text-center text-red-500 mt-12 p-8 max-w-lg mx-auto">
        <p className="text-xl font-semibold">{error}</p>
        <div className="mt-6">
          <Button onClick={() => navigate(-1)} leftIcon={<IoArrowBackOutline />}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-text-secondary hover:bg-background-accent hover:text-text-primary transition-colors"
        >
          <IoArrowBackOutline size={24} />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Twist</h1>
      </div>

      {/* Main Twist Card */}
      <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden shadow-sm">
        {twist && <TwistCard post={twist} onUpdate={fetchTwist} />}
      </div>

      {/* Replies Section */}
      <div className="mt-4">
        <TwistCommentSection twistId={twistId} />
      </div>

    </div >
  );
};

export default TwistDetailPage;
