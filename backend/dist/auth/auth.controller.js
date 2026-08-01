import { supabase } from "../config/supabase";
export const signUp = async (req, res) => {
    const { email, password, fullName } = req.body;
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
            fullName,
        },
    });
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
    return res.status(201).json({
        success: true,
        user: data.user,
    });
};
