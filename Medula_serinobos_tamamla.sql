DECLARE 
	 @str VARCHAR(200)='1.03-001-001-04619.2502016.MENXHMFXD3TTXW',
	 @Gercek INT=0

	
	-- DECLARE @str VARCHAR(200) = '5.03-001-001-10938.F16080012A.12000000065551'	
	-- DECLARE @Gercek INT=1
	
	DECLARE @KopyaAdet INT, @Stok VARCHAR(100), @Lot VARCHAR(200), @Seri VARCHAR(200) 	
    SET @KopyaAdet = PARSENAME(@str, 4)
    SET @Stok = PARSENAME(@str, 3) 
    SET @Lot = PARSENAME(@str, 2) 
    SET @Seri = PARSENAME(@str, 1) 
	
	--RETURN 
	
	--DROP TABLE #tmp_kare
	--DROP TABLE #tmp_har
	--DROP TABLE #Numbers
	CREATE TABLE #Numbers (N INT PRIMARY KEY);
	--DROP TABLE #tmp_esles

	-- kullanılmamış seri nolar   1
	SELECT ROW_NUMBER() OVER(partition BY sk.StokKodu ORDER BY sk.SERINO) AS iNo,
	sk.UNIID ,sk.StokKodu, sk.PARTINO LOTNO, sk.SERINO SeriNo, hs1.SeriNo hseri
	INTO #tmp_kare
	FROM StokKarekod sk 	
	LEFT JOIN HareketS hs1 ON sk.StokKodu = hs1.StokKodu AND sk.PARTINO=hs1.LOTNO and sk.SERINO = hs1.SeriNo
	WHERE sk.StokKodu = @Stok AND sk.PARTINO=@Lot AND hs1.SeriNo IS null 
		
		-- kullanılmamış seri noları ambalaj miktarı kadar çoğalt  2
		INSERT INTO #Numbers (N)
		SELECT TOP (@KopyaAdet) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) FROM sys.all_objects;		
		-- SELECT ROW_NUMBER() OVER (ORDER BY t.iNo, n.N) AS iiNo,t.iNo,t.UNIID,t.StokKodu,t.LOTNO,t.SeriNo,n.N AS KopyaNo	FROM #tmp_kare AS t CROSS JOIN #Numbers n 		

	-- kullanılan seri nolar  3
	SELECT ROW_NUMBER() OVER(partition BY hs.StokKodu ORDER BY hs.SeriNo) AS iiNo,
	hs.Tarih, hs.HareketSId, hs.UniteKodu, hs.StokKodu, hs.LOTNO, hs.SeriNo, ts.AmbalajMiktari 	
	INTO #tmp_har
	FROM HareketS hs
	LEFT JOIN TnmStok ts ON hs.StokKodu = ts.StokKodu	
	WHERE hs.StokKodu=@Stok AND hs.LOTNO=@Lot AND hs.SeriNo=@Seri AND hs.Tarih>='20260101'
	ORDER BY hs.Tarih DESC
	--SELECT * FROM #tmp_har	
		
	-- Kullanılan seri nolara yeni seri nolar eşleştir
	SELECT h.*, nn.SeriNo AS YeniSeriNo
	INTO #tmp_esles
	FROM #tmp_har h  -- 3
	LEFT JOIN (
		SELECT ROW_NUMBER() OVER (ORDER BY t.iNo, n.N) AS iiNo,t.iNo,t.UNIID,t.StokKodu,t.LOTNO,t.SeriNo,n.N AS KopyaNo	FROM #tmp_kare AS t CROSS JOIN #Numbers n 
	) nn ON nn.iiNo=h.iiNo  -- 2
	-- SELECT * FROM #tmp_esles
		 
	IF @Gercek=1 BEGIN
		UPDATE hs SET hs.SeriNo= te.YeniSeriNo
		FROM HareketS hs
		INNER JOIN #tmp_esles te ON hs.HareketSId = te.HareketSId
		WHERE te.YeniSeriNo IS NOT NULL
	END ELSE BEGIN
    	SELECT hs.IslemTakipNo, hs.Tarih, hs.StokKodu, hs.LOTNO, hs.SeriNo, hs.HareketSId, 	te.LOTNO, te.SeriNo, te.AmbalajMiktari, te.YeniSeriNo
		-- UPDATE hs SET hs.SeriNo= te.YeniSeriNo
		FROM HareketS hs
		INNER JOIN #tmp_esles te ON hs.HareketSId = te.HareketSId
		WHERE te.YeniSeriNo IS NOT NULL         	
    END
	





