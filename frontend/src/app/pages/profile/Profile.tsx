import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

import {
  changePassword,
  deleteAvatar,
  deleteProfile,
  getProfile,
  updateProfile,
  uploadAvatar,
} from "../../../api/profileApi";
import { useAuth } from "../../hooks/useAuth";
import type {
  PasswordChangePayload,
  ProfileFormValues,
  UserProfile,
} from "../../types/user";
import { AccountSettings } from "../../components/profile/AccountSettings";
import { DeleteAccountModal } from "../../components/profile/DeleteAccountModal";
import { DeleteAccountCard } from "../../components/profile/DeleteAccountCard";
import { LoadingSkeleton } from "../../components/profile/LoadingSkeleton";
import { PersonalInformation } from "../../components/profile/PersonalInformation";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { ProfileCard } from "../../components/profile/ProfileCard";
import {
  PASSWORD_VALIDATION_MESSAGE,
  getPasswordValidation,
} from "../../utils/passwordValidation";

const EMPTY_PROFILE_FORM: ProfileFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  bio: "",
};

const EMPTY_PASSWORD_FORM: PasswordChangePayload = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/;

interface ProfilePageProps {
  onLogout: () => void;
}

export function Profile({ onLogout }: ProfilePageProps) {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM);
  const [initialValues, setInitialValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM);
  const [passwordValues, setPasswordValues] = useState<PasswordChangePayload>(EMPTY_PASSWORD_FORM);
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileFormValues, string>>
  >({});
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof PasswordChangePayload, string>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatarRequested, setRemoveAvatarRequested] = useState(false);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const displayAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (removeAvatarRequested) return "";
    return profile?.avatar || "";
  }, [avatarPreview, profile?.avatar, removeAvatarRequested]);

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const profileData = await getProfile();
      hydrateProfile(profileData);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load your profile"));
    } finally {
      setIsLoading(false);
    }
  }

  function hydrateProfile(profileData: UserProfile) {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const nextValues = mapProfileToForm(profileData);
    setProfile(profileData);
    setUser(profileData);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setPasswordValues(EMPTY_PASSWORD_FORM);
    setProfileErrors({});
    setPasswordErrors({});
    setPendingAvatarFile(null);
    setAvatarPreview("");
    setRemoveAvatarRequested(false);
  }

  function handleEdit() {
    setIsEditing(true);
  }

  function handleCancel() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setFormValues(initialValues);
    setPasswordValues(EMPTY_PASSWORD_FORM);
    setProfileErrors({});
    setPasswordErrors({});
    setPendingAvatarFile(null);
    setAvatarPreview("");
    setRemoveAvatarRequested(false);
    setIsEditing(false);
  }

  function handleProfileChange(field: keyof ProfileFormValues, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handlePasswordChange(field: keyof PasswordChangePayload, value: string) {
    setPasswordValues((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleAvatarSelection(file: File) {
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Avatar must be a PNG, JPG, JPEG, or WEBP file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be smaller than 2MB");
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setAvatarPreview(previewUrl);
    setRemoveAvatarRequested(false);
  }

  function handleAvatarRemove() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview("");
    setPendingAvatarFile(null);
    setRemoveAvatarRequested(true);
  }

  async function handleSaveProfile() {
    const nextProfileErrors = validateProfile(formValues);
    setProfileErrors(nextProfileErrors);

    if (Object.keys(nextProfileErrors).length > 0) {
      toast.error("Please fix the highlighted profile fields before saving");
      return;
    }

    try {
      setIsSaving(true);

      let latestProfile = await updateProfile(formValues);

      if (removeAvatarRequested && profile?.avatar) {
        latestProfile = await deleteAvatar();
      }

      if (pendingAvatarFile) {
        latestProfile = await uploadAvatar(pendingAvatarFile);
      }

      hydrateProfile(latestProfile);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save your profile"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSavePassword() {
    const nextPasswordErrors = validatePassword(passwordValues);
    setPasswordErrors(nextPasswordErrors);

    if (Object.keys(nextPasswordErrors).length > 0) {
      toast.error("Please fix the password fields before saving");
      return;
    }

    try {
      setIsSaving(true);
      await changePassword(passwordValues);
      setPasswordValues(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to change your password"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      setIsDeleting(true);
      await deleteProfile();
      toast.success("Account deleted successfully");
      onLogout();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete your account"));
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className="space-y-8">
        <ProfileHeader timezone={timezone} />

        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="self-start">
            <ProfileCard
              avatarUrl={displayAvatar}
              formValues={formValues}
              isEditing={isEditing}
              profile={profile}
              onAvatarChange={handleAvatarSelection}
              onAvatarRemove={handleAvatarRemove}
            />
          </div>

          <div className="self-start">
            <PersonalInformation
              disabled={!isEditing || isSaving}
              errors={profileErrors}
              timezone={timezone}
              values={formValues}
              onChange={handleProfileChange}
              isEditing={isEditing}
              isSaving={isSaving}
              onCancel={handleCancel}
              onEdit={handleEdit}
              onSave={() => void handleSaveProfile()}
            />
          </div>
        </div>

        <AccountSettings
          disabled={isSaving}
          errors={passwordErrors}
          isSaving={isSaving}
          values={passwordValues}
          onChange={handlePasswordChange}
          onSave={() => void handleSavePassword()}
        />

        <DeleteAccountCard
          isDeleting={isDeleting}
          onDelete={() => setIsDeleteModalOpen(true)}
        />
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </>
  );
}

function mapProfileToForm(profile: UserProfile): ProfileFormValues {
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    phone: profile.phone || "",
    role: profile.role ? profile.role.trim().toLowerCase() : "",
    bio: profile.bio || "",
  };
}

function validateProfile(values: ProfileFormValues) {
  const errors: Partial<Record<keyof ProfileFormValues, string>> = {};

  if (!values.firstName.trim() || values.firstName.trim().length < 2 || values.firstName.trim().length > 50) {
    errors.firstName = "First name must be between 2 and 50 characters";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!values.email.trim() || !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (values.phone.trim() && !PHONE_REGEX.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number";
  }

  if (values.bio.length > 300) {
    errors.bio = "Bio must be 300 characters or less";
  }

  return errors;
}

function validatePassword(values: PasswordChangePayload) {
  const errors: Partial<Record<keyof PasswordChangePayload, string>> = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Current password is required";
  }

  const passwordValidation = getPasswordValidation(values.newPassword);
  if (!passwordValidation.isValid) {
    errors.newPassword = PASSWORD_VALIDATION_MESSAGE;
  }

  if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Confirm password must match";
  }

  return errors;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
