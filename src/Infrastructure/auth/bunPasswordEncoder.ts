import type { PasswordEncoder } from "../../Domain/Customer/passwordEncoder";

export class BunPasswordEncoder implements PasswordEncoder {
	async encode(plain: string): Promise<string> {
		return await Bun.password.hash(plain);
	}

	async check(encoded: string, plain: string): Promise<boolean> {
		return await Bun.password.verify(plain, encoded);
	}
}
