import React, { useState, useEffect } from 'react';
import { getSavedItems } from '../../../api/userApi';
import Spinner from '../../common/Spinner';
import Post from '../feed/Post';
import ReelCard from '../feed/ReelCard';
import TwistCard from '../feed/TwistCard';
import { IoBookmarkOutline, IoAppsOutline, IoVideocamOutline, IoChatbubbleOutline } from 'react-icons/io5';

const SavedItems = () => {
    const [activeType, setActiveType] = useState('post'); // post, reel, twist
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const data = await getSavedItems(activeType);
                setItems(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [activeType]);

    const Tabs = () => (
        <div className="flex border-b border-border mb-6">
            <button
                onClick={() => setActiveType('post')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${activeType === 'post' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <IoAppsOutline size={18} />
                POSTS
            </button>
            <button
                onClick={() => setActiveType('reel')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${activeType === 'reel' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <IoVideocamOutline size={18} />
                REELS
            </button>
            <button
                onClick={() => setActiveType('twist')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${activeType === 'twist' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <IoChatbubbleOutline size={18} />
                TWISTS
            </button>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex items-center gap-3 mb-6">
                <IoBookmarkOutline className="text-text-accent text-2xl" />
                <h3 className="text-xl font-black text-text-primary tracking-tight uppercase">Saved Items</h3>
            </header>

            <Tabs />

            {loading ? (
                <div className="flex justify-center p-20"><Spinner size="lg" /></div>
            ) : (
                <div className="space-y-6">
                    {items.length === 0 ? (
                        <div className="text-center py-20 bg-background-primary/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-background-accent/50 rounded-full flex items-center justify-center mb-4 text-text-secondary">
                                <IoBookmarkOutline size={30} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">No Saved {activeType}s</h3>
                            <p className="text-sm text-text-secondary mt-1">Items you save will appear here.</p>
                        </div>
                    ) : (
                        <div className={activeType === 'reel' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : 'space-y-4'}>
                            {items.map(item => {
                                if (activeType === 'post' && item.post_details) {
                                    return (
                                        <div key={item.id} className="relative group">
                                            <Post post={item.post_details} onUpdate={() => setActiveType(activeType)} />
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await getSavedItems(activeType); // refresh logic would be better with local filter
                                                    setItems(prev => prev.filter(i => i.id !== item.id));
                                                }}
                                                className="absolute top-6 right-6 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                                title="Remove from saved"
                                            >
                                                <IoBookmarkOutline size={16} />
                                            </button>
                                        </div>
                                    );
                                }
                                if (activeType === 'reel' && item.reel_details) {
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => window.location.href = `/reels/${item.reel_details.id}`}
                                            className="aspect-[9/16] relative rounded-lg overflow-hidden group cursor-pointer border border-border shadow-sm hover:shadow-xl transition-all"
                                        >
                                            {item.reel_details.media_type === 'video' ? (
                                                <video src={item.reel_details.media_file} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={item.reel_details.media_file} className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                                                {item.reel_details.media_type === 'video' ? <IoVideocamOutline className="text-white text-3xl mb-2" /> : <div className="text-white text-3xl mb-2">🖼️</div>}
                                                <span className="text-white text-xs font-bold px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">VIEW REEL</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (activeType === 'twist' && item.twist_details) {
                                    return (
                                        <div key={item.id} className="relative group">
                                            <TwistCard post={item.twist_details} onUpdate={() => setActiveType(activeType)} />
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setItems(prev => prev.filter(i => i.id !== item.id));
                                                }}
                                                className="absolute top-4 right-4 p-2 bg-background-accent text-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500"
                                                title="Remove from saved"
                                            >
                                                <IoBookmarkOutline size={16} />
                                            </button>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SavedItems;
