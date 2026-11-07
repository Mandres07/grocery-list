export interface AccountFormState {
  message: string;
  success: boolean;
  retryable?: boolean;
  successHref?: string;
}

export type AccountFormAction = (state: AccountFormState, data: FormData) => Promise<AccountFormState>;
