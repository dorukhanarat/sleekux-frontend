import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import { executeTransformations, getTransformations } from '../transformationApi';
import type { TransformationDefinition, TransformResponse } from '../../types/transformation';

describe('transformationApi', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('getTransformations returns the definitions from the server', async () => {
        const definitions: TransformationDefinition[] = [
            { key: 'upper', displayName: 'Uppercase', parameters: [] },
        ];
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: definitions });

        await expect(getTransformations()).resolves.toEqual(definitions);
        expect(get).toHaveBeenCalledWith(expect.stringMatching(/^\/?api\/transformations$/));
    });

    it('executeTransformations posts the payload and returns the response', async () => {
        const payload = {
            text: 'hello',
            steps: [{ transformationKey: 'upper', parameters: {} }],
        };
        const response: TransformResponse = { originalText: 'hello', finalResult: 'HELLO', history: [] };
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: response });

        await expect(executeTransformations(payload)).resolves.toEqual(response);
        expect(post).toHaveBeenCalledWith('/api/transform', payload);
    });

    it('propagates request errors', async () => {
        vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Network Error'));

        await expect(getTransformations()).rejects.toThrow('Network Error');
    });
});
