# Bot EUREKA — instrukcja dla Claude

Zanim cokolwiek zrobisz w tym folderze, przeczytaj:
1. `PRZEKAZANIE.md` — cel, decyzje użytkownika, jak z nim pracować, wdrożenie na serwerze,
   błędy z wdrożenia, otwarte sprawy.
2. `ZMIANY.md` — jak działa bieg, foldery, maile, uruchamianie ręczne.

Najważniejsze zasady (szczegóły w PRZEKAZANIE.md):
- Rozmawiaj po polsku, prostym językiem — użytkownik nie jest programistą.
- Krok po kroku: przed większą zmianą plan i zgoda; po zmianie tabela „było / jest / dlaczego”.
- Nie zmieniaj fraz w profilach bez decyzji użytkownika. Filtrujemy wyniki, nie frazy.
- Limity EUREKI (15 s między zapytaniami, 15 min po 403/429) są nienaruszalne.
- Bot działa na serwerze użytkownika (`/root/eureka-bot`, dane w `/root/eureka-dane`);
  z sesji Claude nie ma dostępu do EUREKI ani do serwera — polecenia uruchamia użytkownik.
  Podawaj gotowe polecenia, każde w osobnym bloku, i mów, w którym oknie je wpisać.
- Każdą zmianę kodu: test w `tests/`, `python -m unittest discover -s tests`, commit, push,
  a użytkownikowi plik do podmiany + przypomnienie o dokładnej nazwie pliku.
