export type ActionState = { ok: boolean; message: string; at: number } | null;
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
