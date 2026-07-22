import { Request, Response } from "express";


import { processMedia } from "./media.service";
import { processImage } from "./image.service";


export const uploadImages = async (

    req: Request,

    res: Response

) => {

    try {

        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {

            return res.status(400).json({

                success: false,

                message: "No images uploaded."

            });

        }

        const uploaded = [];

        for (const file of files) {

            const userId = (req as any).user?.id ?? null;
            uploaded.push(await processImage(userId, file));

        }

        return res.status(201).json({

            success: true,

            data: uploaded

        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: "Image upload failed."

        });

    }

};




export const uploadVideoController = async (
    req: Request,
    res: Response
) => {

    try {

        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Video is required."
            });
        }

        // We'll call processVideo() here in Part 4

        return res.status(200).json({
            success: true,
            message: "Video received."
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Upload failed."
        });

    }

};



export const uploadMedia = async (

    req: Request,

    res: Response

) => {

    try {

        const user = (req as any).user;

        const files = req.files as Express.Multer.File[];

        if (!files?.length) {

            return res.status(400).json({

                success: false,

                message: "No media uploaded."

            });

        }

        const uploaded = [];

        for (const file of files) {

            uploaded.push(

                await processMedia(

                    user.id,

                    file

                )

            );

        }

        return res.status(201).json({

            success: true,

            data: uploaded

        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: "Upload failed."

        });

    }

};

