import { Request, Response } from "express";

import {
    updatePresence,
    setOffline,
    getOnlineFriends
} from "./presence.service";

export const heartbeat = async (
    req: Request,
    res: Response
) => {

    try {

        await updatePresence((req as any).user!.id);

        return res.json({
            success: true
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

export const offline = async (
    req: Request,
    res: Response
) => {

    try {

        await setOffline((req as any).user!.id);

        return res.json({
            success: true
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

export const onlineFriends = async (
    req: Request,
    res: Response
) => {

    try {

        const users = await getOnlineFriends((req as any).user!.id);

        return res.json({

            success: true,

            data: users

        });

    } catch (error: any) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};