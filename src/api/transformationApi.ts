import { apiClient } from "./client";
import type { TransformationDefinition, TransformRequestPayload, TransformResponse } from "../types/transformation";

export const getTransformations = async (): Promise<TransformationDefinition[]> => {
    const response = await apiClient.get<TransformationDefinition[]>('api/transformations');
    return response.data;
};

export const executeTransformations = async (
    payload: TransformRequestPayload
) : Promise <TransformResponse> => {
    const response = await apiClient.post<TransformResponse>('/api/transform', payload);
    return response.data;
}



