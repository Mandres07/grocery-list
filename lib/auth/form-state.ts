export interface AccountFormState {
  message: string;
  success: boolean;
  retryable?: boolean;
}

export type AccountFormAction = (state: AccountFormState, data: FormData) => Promise<AccountFormState>;
