import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
export const signup = async (req, res) => {
    const { email, password, fullName } = req.body;
    console.log(email, password, fullName);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    });
    console.log(error);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
    res.status(201).json({
        success: true,
        user: data.user,
        session: data.session,
    });
};
