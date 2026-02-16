import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user: callingUser },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !callingUser) {
      throw new Error("Unauthorized: Invalid user");
    }

    const { data: callingProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", callingUser.id)
      .maybeSingle();

    if (profileError || !callingProfile) {
      throw new Error("Unable to verify user permissions");
    }

    if (callingProfile.role !== "super_admin") {
      throw new Error("Unauthorized: Only super admins can delete users");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("Missing userId parameter");
    }

    if (userId === callingUser.id) {
      throw new Error("Cannot delete your own account");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userToDelete, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError || !userToDelete) {
      throw new Error("User not found");
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteAuthError) {
      throw new Error(`Failed to delete user: ${deleteAuthError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: "User deleted successfully",
        deletedUser: {
          email: userToDelete.email,
          name: userToDelete.full_name,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
