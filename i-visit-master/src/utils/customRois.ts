import type { RoiSpec, SupportedIdType } from './cardTemplates';
import { getTemplateForIdType } from './cardTemplates';

const STORAGE_KEY_PREFIX = 'ivisit-custom-rois-';

export interface CustomRois {
    idType: SupportedIdType;
    rois: RoiSpec[];
    version: number;
    updatedAt: string;
}

export function getStorageKey(idType: SupportedIdType): string {
    return `${STORAGE_KEY_PREFIX}${idType.replace(/\s+/g, '-').toLowerCase()}`;
}

export function getCustomRois(idType: SupportedIdType): CustomRois | null {
    const key = getStorageKey(idType);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
        return JSON.parse(stored) as CustomRois;
    } catch {
        return null;
    }
}

export function saveCustomRois(idType: SupportedIdType, rois: RoiSpec[]): void {
    const key = getStorageKey(idType);
    const data: CustomRois = {
        idType,
        rois,
        version: 1,
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
}

export function resetCustomRois(idType: SupportedIdType): void {
    const key = getStorageKey(idType);
    localStorage.removeItem(key);
}

export function getMergedRois(idType: SupportedIdType): RoiSpec[] {
    const custom = getCustomRois(idType);
    if (custom && custom.rois.length > 0) {
        return custom.rois;
    }

    const template = getTemplateForIdType(idType);
    return template?.rois || [];
}

export function hasCustomRois(idType: SupportedIdType): boolean {
    return getCustomRois(idType) !== null;
}
