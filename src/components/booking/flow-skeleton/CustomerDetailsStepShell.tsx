import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import {
  getBookingFlowImageGroups,
  getBookingFlowCategoryCapabilities,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import type {
  BookingCustomerDetailsState,
  BookingFlowCategory,
  BookingImageGroupStateKey,
} from "@/lib/bookings/bookingFlowSkeleton/types";

type CustomerDetailsStepShellProps = {
  category: BookingFlowCategory | null;
  details: BookingCustomerDetailsState;
  onChangeName?: (value: string) => void;
  onChangePhone?: (value: string) => void;
  onChangeRequestNote?: (value: string) => void;
  onSelectCurrentHairImages?: (files: File[]) => void;
  onSelectDesiredStyleImages?: (files: File[]) => void;
  onResetCurrentHairImages?: () => void;
  onResetDesiredStyleImages?: () => void;
};

export function CustomerDetailsStepShell({
  category,
  details,
  onChangeName,
  onChangePhone,
  onChangeRequestNote,
  onSelectCurrentHairImages,
  onSelectDesiredStyleImages,
  onResetCurrentHairImages,
  onResetDesiredStyleImages,
}: CustomerDetailsStepShellProps) {
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsCustomerDetails = capabilities?.interactiveCustomerDetails === true;
  const imageGroups = getBookingFlowImageGroups(category);

  const imageGroupHandlers: Record<
    BookingImageGroupStateKey,
    {
      onSelect?: (files: File[]) => void;
      onReset?: () => void;
    }
  > = {
    currentStateImages: {
      onSelect: onSelectCurrentHairImages,
      onReset: onResetCurrentHairImages,
    },
    desiredStyleImages: {
      onSelect: onSelectDesiredStyleImages,
      onReset: onResetDesiredStyleImages,
    },
  };

  return (
    <BookingFlowStepFrame
      eyebrow="Step 3"
      title="Customer details"
      description="Preview step with profile defaults, request note, and two local-only image sections."
    >
      {supportsCustomerDetails ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-800">Profile autofill</p>
            <p className="mt-1 text-sm text-neutral-600">Source: {details.profileSource}</p>
            <p className="mt-1 text-sm text-neutral-600">
              If auth/profile data exists, name and contact are prefilled. You can edit both fields.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
              <span className="text-sm font-medium text-neutral-700">Customer name</span>
              <input
                type="text"
                value={details.name}
                onChange={(event) => onChangeName?.(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                placeholder="Name"
              />
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
              <span className="text-sm font-medium text-neutral-700">Contact</span>
              <input
                type="tel"
                value={details.phone}
                onChange={(event) => onChangePhone?.(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                placeholder="Phone or messenger contact"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
            <span className="text-sm font-medium text-neutral-700">Request note</span>
            <textarea
              value={details.requestNote}
              onChange={(event) => onChangeRequestNote?.(event.target.value)}
              rows={4}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              placeholder="Describe your preferred style, concerns, or requests."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {imageGroups.map((group) => {
              const files = details[group.stateKey];
              const handlers = imageGroupHandlers[group.stateKey];

              return (
                <div key={group.id} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-sm font-medium text-neutral-800">{group.editorTitle}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Local preview files: {files.length}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700">
                      Add files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const nextFiles = event.target.files ? Array.from(event.target.files) : [];
                          if (nextFiles.length > 0) {
                            handlers.onSelect?.(nextFiles);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handlers.onReset}
                      className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600"
                    >
                      Clear
                    </button>
                  </div>
                  {files.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-neutral-700">
                      {files.map((item) => (
                        <li key={item.id}>{item.fileName}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-neutral-500">
            Files stay in local preview state only and are not uploaded.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
          Step 3 interactive form is wired for all skeleton categories in this turn.
        </div>
      )}
    </BookingFlowStepFrame>
  );
}
