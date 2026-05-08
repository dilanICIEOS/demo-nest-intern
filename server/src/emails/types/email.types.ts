export type EmailData = {
  to: string;
  subject: string;
  template: string;
  context: {
    otp?: string;
    resetPasswordLink?: string;
  };
};
