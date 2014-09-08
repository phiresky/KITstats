for f in **/*.csv
	sed -r '/^,+$/d' -i "$f"
end
