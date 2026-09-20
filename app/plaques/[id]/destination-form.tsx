"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DestinationForm({
	plaqueId,
	currentUrl,
}: {
	plaqueId: string;
	currentUrl: string;
}) {
	const [url, setUrl] = useState(currentUrl);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");
	const router = useRouter();

	async function saveDestination(e: React.FormEvent) {
		e.preventDefault();

		setSaving(true);
		setMessage("");

		let cleanUrl = url.trim();

		if (
			!cleanUrl.startsWith("http://") &&
			!cleanUrl.startsWith("https://")
		) {
			cleanUrl = `https://${cleanUrl}`;
		}

		try {
			new URL(cleanUrl);
		} catch {
			setMessage("Enter a valid website URL.");
			setSaving(false);
			return;
		}

		const supabase = createClient();

		const { error } = await supabase
			.from("plaques")
			.update({
				destination_url: cleanUrl,
			})
			.eq("id", plaqueId);

		if (error) {
			setMessage("Could not update the destination.");
			setSaving(false);
			return;
		}

		setUrl(cleanUrl);
		setMessage("Destination updated successfully.");
		setSaving(false);

		router.refresh();
	}

	return (
		<form onSubmit={saveDestination} className="mt-5">
			<label
				htmlFor="destination"
				className="text-sm font-medium text-slate-700"
			>
				Destination URL
			</label>

			<input
				id="destination"
				type="text"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#16c7c0]"
				placeholder="https://example.com"
			/>

			<button
				type="submit"
				disabled={saving}
				className="mt-4 rounded-lg bg-[#17324d] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
			>
				{saving ? "Saving..." : "Save Destination"}
			</button>

			{message && (
				<p className="mt-3 text-sm text-gray-600">
					{message}
				</p>
			)}
		</form>
	);
}
