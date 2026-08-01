import { likePostService, unlikePostService, getLikesService } from "./like.service";
export async function likePost(req, res) {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        const data = await likePostService(userId, postId);
        return res.json({
            success: true,
            message: "Post liked",
            data
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function unlikePost(req, res) {
    try {
        const userId = req.user.id;
        const postId = req.params.id;
        await unlikePostService(userId, postId);
        return res.json({
            success: true,
            message: "Like removed"
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export async function getLikes(req, res) {
    try {
        const postId = req.params.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const data = await getLikesService(postId, page, limit);
        return res.json({
            success: true,
            ...data
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
