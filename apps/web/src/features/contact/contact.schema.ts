import { z } from "zod";

export const contactSchema = z
  .object({
    submissionId: z.uuid(),
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().min(1).max(254).pipe(z.email()),
    budget: z.enum([
      "under-100000",
      "100000-300000",
      "300000-500000",
      "over-500000",
      "undecided",
    ]),
    message: z.string().trim().min(1).max(5000),
    turnstileToken: z.string().min(1).max(2048),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
