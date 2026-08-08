import { Request, Response } from "express";

import {
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowers,
    getFollowing,
    getSuggestedFriends
} from "./follow.service";
import { AnyCnameRecord } from "node:dns";

export const follow = async (req: Request, res: Response) => {

    try {

        const currentUserId = (req as any).user!.id;
        const targetUserId = (req as any).params.id;

        const result = await followUser(
            currentUserId,
            targetUserId
        );

        return res.status(201).json({
            success: true,
            message: "User followed successfully.",
            data: result
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

export const unfollow = async (req: Request, res: Response) => {

    try {

        const currentUserId = (req as any).user!.id;
        const targetUserId = (req as any).params.id;

        const result = await unfollowUser(
            currentUserId,
            targetUserId
        );

        return res.status(201).json({
            success: true,
            message: "User unfollowed successfully.",
            data: result
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

export const followStatus = async (
    req: Request,
    res: Response
) => {

    try {

        const currentUserId = (req as any).user!.id;
        const targetUserId = (req as any).params.id;

        const result = await getFollowStatus(
            currentUserId,
            targetUserId
        );

        return res.json({
            success: true,
            ...result
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

export const followers = async (
    req: Request,
    res: Response
) => {


    try {

        const userId = (req as any).params.id;

        const data = await getFollowers(userId);

        return res.json({
            success: true,
            count: data.length,
            data
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

export const following = async (
    req: Request,
    res: Response
) => {
 

    try {

        const userId = (req as any).params.id;

        const data = await getFollowing(userId);

        return res.json({
            success: true,
            count: data.length,
            data
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

// suggestion

export const suggestedFriends = async (
    req: Request,
    res: Response
) => {
    // console.log("Calling Suggested Friends");

    try {

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        const userId = (req as any).user!.id;

        const users = await getSuggestedFriends(
            userId,
            page,
            limit
        );

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