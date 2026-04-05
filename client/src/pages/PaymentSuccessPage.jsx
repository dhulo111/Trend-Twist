import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

import api from '../api/axiosInstance';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();
    const [verificationStatus, setVerificationStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('Verifying your subscription...');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId) {
                setVerificationStatus('error');
                setMessage('No session ID found.');
                return;
            }

            try {
                // Ensure api is used correctly and include trailing slash
                const response = await api.get(`/subscriptions/verify/?session_id=${sessionId}`);
                
                if (response.data.status === 'success') {
                    setVerificationStatus('success');
                    setMessage('Your subscription has been successfully activated!');
                } else {
                    setVerificationStatus('error');
                    setMessage(response.data.error || response.data.message || 'Payment verification failed.');
                }
            } catch (err) {
                console.error("Verification error detail:", err.response?.data || err.message);
                setVerificationStatus('error');
                
                // Extract error specifically to prevent showing 'get' or crashing
                const errorInfo = err.response?.data?.error || err.response?.data?.detail || err.message;
                setMessage(typeof errorInfo === 'string' ? errorInfo : 'An error occurred during verification.');
            }
        };

        verifyPayment();
    }, [sessionId, navigate]);

    if (verificationStatus === 'loading') {
        return (
            <div className="min-h-screen bg-background-primary flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" className="mx-auto mb-4" />
                    <p className="text-text-secondary">{message}</p>
                </div>
            </div>
        );
    }

    const isError = verificationStatus === 'error';

    return (
        <div className="min-h-screen bg-background-primary flex items-center justify-center p-4">
            <div className={`max-w-md w-full bg-background-secondary border border-border rounded-3xl p-8 text-center shadow-xl animate-in zoom-in-95 duration-500`}>
                <div className={`w-20 h-20 ${isError ? 'bg-red-500/10' : 'bg-green-500/10'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    {isError ? (
                        <span className="text-red-500 text-4xl font-bold">!</span>
                    ) : (
                        <FaCheckCircle className="text-green-500 text-4xl" />
                    )}
                </div>
                
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                    {isError ? 'Verification Failed' : 'Success!'}
                </h1>
                <p className="text-text-secondary mb-8 leading-relaxed">
                    {isError ? message : 'Your subscription has been activated. You now have full access to exclusive content for the next 30 days.'}
                </p>

                <div className="space-y-3">
                    <Button 
                        variant="primary" 
                        fullWidth 
                        onClick={() => navigate('/')}
                        rightIcon={<FaArrowRight />}
                    >
                        Go to Feed
                    </Button>
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
                    >
                        Return to Profile
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2 text-xs text-text-secondary">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Transaction Reference: {sessionId?.substring(0, 12)}...
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
