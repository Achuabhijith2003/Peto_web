import { updatePresence, setOffline, getOnlineFriends } from "./presence.service";
export const heartbeat = async (req, res) => {
    try {
        await updatePresence(req.user.id);
        return res.json({
            success: true
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const offline = async (req, res) => {
    try {
        await setOffline(req.user.id);
        return res.json({
            success: true
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const onlineFriends = async (req, res) => {
    try {
        const users = await getOnlineFriends(req.user.id);
        return res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
