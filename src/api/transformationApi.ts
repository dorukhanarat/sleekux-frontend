import { apiClient } from "./client";
import type { TransformationDefinition } from "../types/transformation";

export const getTransformations = async (): Promise<TransformationDefinition[]> => {
    const response = await apiClient.get<TransformationDefinition[]>('api/transformations');
    return response.data;
};

