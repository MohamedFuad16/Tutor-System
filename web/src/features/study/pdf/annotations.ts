/** Annotation colours, the optimistic-id prefix, and optimistic create/remove mutations for a document. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Annotation } from "@shared/types";
import { toast } from "@/components/ui";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export const HIGHLIGHT_COLOR = "#facc15";
export const UNDERLINE_COLOR = "#ff6e00";
export const PENDING_PREFIX = "pending-";

type NewAnnotation = Pick<Annotation, "page" | "kind" | "color" | "text" | "rects"> & { note?: string };

export function useAnnotationMutations(documentId: string) {
  const client = useQueryClient();
  const key = keys.annotations(documentId);

  const create = useMutation({
    mutationFn: (input: NewAnnotation) =>
      api<Annotation>(`/documents/${documentId}/annotations`, { method: "POST", json: input }),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: key });
      const optimistic: Annotation = {
        ...input,
        id: `${PENDING_PREFIX}${Date.now()}`,
        documentId,
        createdAt: Date.now(),
      };
      client.setQueryData<Annotation[]>(key, (list) => [...(list ?? []), optimistic]);
      return { optimisticId: optimistic.id };
    },
    onError: (_error, input, context) => {
      client.setQueryData<Annotation[]>(key, (list) => list?.filter((item) => item.id !== context?.optimisticId));
      toast(`Couldn't save that ${input.kind}. Please try again.`, "error");
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/annotations/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const removed = client.getQueryData<Annotation[]>(key)?.find((item) => item.id === id);
      client.setQueryData<Annotation[]>(key, (list) => list?.filter((item) => item.id !== id));
      return { removed };
    },
    onError: (_error, _id, context) => {
      const removed = context?.removed;
      if (removed) client.setQueryData<Annotation[]>(key, (list) => [...(list ?? []), removed]);
      toast("Couldn't remove that annotation. Please try again.", "error");
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  return { create, remove };
}
