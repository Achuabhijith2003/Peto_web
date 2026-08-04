import { createPostSchema } from "./post.validation";
import { createPostService, getPostById, updatePostById, deletePostById, getMyPostsService, getUserPostsService, getGlobalFeedService, searchPostsService } from "./post.service";
export const createPost = async (req, res) => {
    try {
        const user = req.user;
        const parsed = createPostSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                errors: parsed.error.flatten()
            });
        }
        const post = await createPostService({
            userId: user.id,
            ...parsed.data
        });
        return res.status(201).json({
            success: true,
            data: post
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
export async function getPost(req, res) {
    try {
        const userId = req.user?.id;
        const postId = req.params.id;
        console.log("UserID: ", userId, "\nPostid: ", postId);
        console.log("Calling Function: getPost");
        const post = await getPostById(postId, userId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
        return res.json({
            success: true,
            data: post
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function updatePost(req, res) {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        const { text, visibility } = req.body;
        const post = await updatePostById(postId, userId, text, visibility);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found or permission denied."
            });
        }
        return res.json({
            success: true,
            message: "Post updated successfully.",
            data: post
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function deletePost(req, res) {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        const result = await deletePostById(postId, userId);
        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }
        return res.json({
            success: true,
            message: "Post deleted successfully."
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function getMyPosts(req, res) {
    try {
        const userId = req.user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const data = await getMyPostsService(userId, page, limit);
        return res.json({
            success: true,
            ...data
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function getUserPosts(req, res) {
    try {
        const userId = req.params.id;
        const profileId = req.params.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await getUserPostsService(profileId, userId, page, limit);
        return res.json({
            success: true,
            ...result
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function getGlobalFeed(req, res) {
    try {
        const userId = req.user?.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await getGlobalFeedService(userId, page, limit);
        return res.json({
            success: true,
            ...result
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function searchPosts(req, res) {
    try {
        const userId = req.user?.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const q = String(req.query.q || "");
        if (!q.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
        }
        const result = await searchPostsService(userId, q, page, limit);
        return res.json({
            success: true,
            data: result.posts,
            pagination: result.pagination,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}
