import { validate } from "class-validator";
import { ResetPasswordDto } from "./reset-password.dto";

describe("ResetPasswordDto", () => {
  it("accepts a strong password", async () => {
    const dto = new ResetPasswordDto();
    dto.newPassword = "PasswordBaru123!";

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects a password without complete character groups", async () => {
    const dto = new ResetPasswordDto();
    dto.newPassword = "passwordpanjang123";

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "newPassword")).toBe(true);
  });

  it("rejects a reason shorter than three characters", async () => {
    const dto = new ResetPasswordDto();
    dto.newPassword = "PasswordBaru123!";
    dto.reason = "x";

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "reason")).toBe(true);
  });
});
