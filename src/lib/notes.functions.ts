import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Records a download for the signed-in user and bumps the note's counter. */
export const recordDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ noteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("downloads").insert({ note_id: data.noteId, user_id: userId });
    if (error) throw new Error(error.message);
    await supabase.rpc("increment_download", { _note_id: data.noteId });
    return { ok: true };
  });
