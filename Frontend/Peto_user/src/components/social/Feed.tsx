import Stories from "./Stories";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";

import avatar1 from "../../assets/hero.png";
import avatar2 from "../../assets/hero.png";

import post1 from "../../assets/hero.png";
import post2 from "../../assets/hero.png";

const Feed = () => {
    return (
        <section className="space-y-8">
            <Stories />

            <CreatePost />

            <PostCard
                avatar={avatar1}
                user="Emma Wilson"
                location="California"
                time="12 min ago"
                pet="Golden Retriever"
                caption="Charlie enjoyed his first beach day! 🌊🐶"
                images={[post1,post2]}
                likes={328}
                comments={41}
                shares={17}
            />

            <PostCard
                avatar={avatar2}
                user="Alex Brown"
                location="New York"
                time="1 hour ago"
                pet="Persian Cat"
                caption="Luna's healthy breakfast today!"
                images={[post2]}
                likes={514}
                comments={73}
                shares={28}
            />
        </section>
    );
};

export default Feed;