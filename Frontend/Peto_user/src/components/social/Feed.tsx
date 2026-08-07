import { useEffect, useState } from "react";
import api from "../../utils/api";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import OnlineFriends from "./OnlineFriends";
import SuggestedFriends from "./SuggestedFriends";

const Feed = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeed = async () => {
        try {
            const response = await api.get("/posts/feed");
            setPosts(response.data.posts || []);
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    return (
        <section className="space-y-6">
            <CreatePost onPostCreated={fetchFeed} />

            {/* Mobile Online Friends */}
            <div className="lg:hidden">
                <OnlineFriends />
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500 font-medium">Loading feed...</div>
            ) : posts.length > 0 ? (
                posts.map((post, index) => (
                    <div key={post.id} className="space-y-6">
                        <PostCard post={post} />
                        {/* Insert Suggested Friends on mobile after post 2 or at the end if fewer posts */}
                        {(index === 1 || (posts.length < 2 && index === posts.length - 1)) && (
                            <div className="lg:hidden">
                                <SuggestedFriends />
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="space-y-6">
                    <div className="text-center py-10 text-slate-500 font-medium">No posts yet.</div>
                    <div className="lg:hidden">
                        <SuggestedFriends />
                    </div>
                </div>
            )}
        </section>
    );
};

export default Feed;