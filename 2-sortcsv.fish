for i in (seq 20)
	mkdir -p Stat$i
	grep -rl "Statistik $i\W"|while read n
		mv "$n" Stat$i
	end
end
