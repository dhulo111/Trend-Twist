import React, { useState, useEffect } from 'react';
import { getStoryArchive } from '../../../api/storyApi';
import Spinner from '../../common/Spinner';
import { IoCalendarOutline, IoTimeOutline } from 'react-icons/io5';
import StoryViewerModal from './StoryViewerModal';

const StoryArchive = () => {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerContext, setViewerContext] = useState({ isOpen: false, story: null, monthStories: [] });

    useEffect(() => {
        const fetchArchive = async () => {
            try {
                const data = await getStoryArchive();
                setStories(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchArchive();
    }, []);

    // Group stories by Month and Year
    const groupStories = (stories) => {
        const groups = {};
        stories.forEach(story => {
            const date = new Date(story.created_at);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) groups[monthYear] = [];
            groups[monthYear].push(story);
        });
        return groups;
    };

    const groupedStories = groupStories(stories);

    const handleViewStory = (story, monthStories) => {
        const storyIndex = monthStories.findIndex(s => s.id === story.id);
        setViewerContext({
            isOpen: true,
            story: story,
            monthStories: monthStories,
            index: storyIndex
        });
    };

    if (loading) return <div className="flex justify-center p-20"><Spinner size="lg" /></div>;

    if (stories.length === 0) {
        return (
            <div className="text-center py-20 bg-background-primary/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-background-accent/50 rounded-full flex items-center justify-center mb-4">
                    <IoTimeOutline size={30} className="text-text-accent" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">No Stories Yet</h3>
                <p className="text-sm text-text-secondary mt-1">Your past stories will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-10">
            <header className="flex items-center gap-3 border-b border-border pb-4 mb-8">
                <IoCalendarOutline className="text-text-accent text-2xl" />
                <h3 className="text-xl font-black text-text-primary tracking-tight">STORY ARCHIVE</h3>
            </header>

            {Object.keys(groupedStories).map(monthYear => (
                <section key={monthYear} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <h4 className="text-xs font-black text-text-secondary tracking-[0.2em] uppercase">
                            {monthYear}
                        </h4>
                        <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-4">
                        {groupedStories[monthYear].map(story => (
                            <div 
                                key={story.id} 
                                onClick={() => handleViewStory(story, groupedStories[monthYear])}
                                className="aspect-[9/16] rounded-xl overflow-hidden bg-background-accent cursor-pointer relative group transition-all hover:scale-[1.03] active:scale-95 shadow-lg border border-white/10"
                            >
                                {story.media_type === 'video' ? (
                                    <video 
                                        src={story.media_file} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                ) : (
                                    <img 
                                        src={story.media_file} 
                                        alt="" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity" />
                                
                                {/* Date Badge */}
                                <div className="absolute top-2 right-2 flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                                    <span className="text-[10px] font-black text-white leading-none">
                                        {new Date(story.created_at).getDate()}
                                    </span>
                                </div>

                                {/* Hover Play Indicator if video */}
                                {story.media_type === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/40">
                                            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {viewerContext.isOpen && (
                <StoryViewerModal
                    isOpen={viewerContext.isOpen}
                    onClose={() => setViewerContext({ ...viewerContext, isOpen: false })}
                    storyGroups={[{
                        id: viewerContext.monthStories[0].author,
                        username: viewerContext.monthStories[0].author_username,
                        profile_picture: viewerContext.monthStories[0].author_profile_picture,
                        stories: viewerContext.monthStories
                    }]}
                    initialGroupIndex={0}
                    initialStoryIndex={viewerContext.index}
                />
            )}
        </div>
    );
};

export default StoryArchive;
