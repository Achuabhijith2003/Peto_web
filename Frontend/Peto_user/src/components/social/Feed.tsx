import { useEffect, useState } from "react";
import api from "../../utils/api";
// import Stories from "./Stories";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";

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
        <section className="space-y-8">
            {/* <Stories /> */}

            <CreatePost onPostCreated={fetchFeed} />

            {loading ? (
                <div className="text-center py-10">Loading feed...</div>
            ) : posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))
            ) : (
                <div className="text-center py-10 text-gray-500">No posts yet.</div>
            )}
        </section>
    );
};

export default Feed;