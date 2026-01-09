export function formatDate(date: Date): string {
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

export function isBefore(date: Date, reference: Date): boolean {
	return date.getTime() < reference.getTime();
}

export function isAfter(date: Date, reference: Date): boolean {
	return date.getTime() > reference.getTime();
}

export function isWithin(date: Date, from: Date, to: Date): boolean {
	const time = date.getTime();
	return time >= from.getTime() && time <= to.getTime();
}

export function getDate(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}
