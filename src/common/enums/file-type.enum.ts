/**
 * Only PROFILE exists for now. Add more as you introduce new upload use
 * cases (e.g. LICENCE_FRONT, VEHICLE_IMAGE) — the service/controller are
 * already generic enough to support additional types without changes;
 * you'd just add validation rules for the new type in FileuploadService.
 */
export enum FileType {
  PROFILE = 'profile',
}
