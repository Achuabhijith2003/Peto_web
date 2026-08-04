import { supabase } from "../config/supabase";
export async function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        return res.status(401).json({
            message: "Invalid token",
        });
    }
    req.user = data.user;
    next();
}
export async function optionalAuthenticate(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        req.user = null;
        return next();
    }
    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
            req.user = data.user;
        }
        else {
            req.user = null;
        }
    }
    catch {
        req.user = null;
    }
    next();
}
