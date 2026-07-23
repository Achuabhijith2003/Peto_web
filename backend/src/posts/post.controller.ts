import { Request, Response } from "express";

import { createPostSchema } from "./post.validation";

import { createPostService, getPostById, updatePostById, deletePostById } from "./post.service";

export const createPost = async (

    req: Request,

    res: Response

) => {

    try {

        const user = (req as any).user;

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

    } catch (err: any) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

};


export async function getPost(req: Request, res: Response) {

    try {

        const userId = (req as any).user.id;

        const postId = (req as any).params.id;

        console.log("UserID: ", userId, "\nPostid: ", postId);


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

    catch (err: any) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

}


export async function updatePost(
    req: Request,
    res: Response
) {

    try {

        const userId = (req as any).user.id;

        const postId = (req as any).params.id;

        const { text, visibility } = req.body;

        const post = await updatePostById(

            postId,

            userId,

            text,

            visibility

        );

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

    catch (err: any) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

}



export async function deletePost(
    req: Request,
    res: Response
) {
    try {

        const userId = (req as any).user.id;
        const postId = (req as any).params.id;

        const result = await deletePostById(
            postId,
            userId
        );

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

    } catch (err: any) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }
}