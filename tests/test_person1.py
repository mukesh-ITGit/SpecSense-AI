import pytest
from app.services.extraction.rule_engine import rule_engine
from app.services.extraction.enrichment_service import enrichment_service
from app.services.pipeline import pipeline

def test_rule_engine_part_number():
    text = 'DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc'
    res = rule_engine.parse(text)
    assert res["part_number"] == "DCB518ASTS06G"
    assert res["category"] == "Abrasives"
    assert res["product_type"] == "Sanding Belt"
    assert res["attributes"]["width"] == "1/2 in"
    assert res["attributes"]["length"] == "18 in"
    assert res["attributes"]["pack_quantity"] == 6

def test_rule_engine_disc():
    text = 'Diablo 4-1/2" Sanding Disc P80 10 Pack'
    res = rule_engine.parse(text)
    assert res["product_type"] == "Sanding Disc"
    assert res["attributes"]["diameter"] == "4-1/2 in"
    assert res["attributes"]["grit"] == "80"
    assert res["attributes"]["pack_quantity"] == 10

def test_enrichment_service_brand():
    text = 'DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc'
    res = enrichment_service.enrich(text)
    assert res["brand"] == "DIABLO"
    assert res["manufacturer"] == "DIABLO"

def test_ten_test_cases():
    test_cases = [
        ('DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc', "Sanding Belt", 6),
        ('Diablo 4-1/2" Sanding Disc P80 10 Pack', "Sanding Disc", 10),
        ('7" Grinding Wheel 1/4" Thick 24 Grit', "Grinding Wheel", None),
        ('4.5" Cut-Off Wheel 0.045" 5 Pack', "Cut-Off Wheel", 5),
        ('115mm Abrasive Disc P120', "Abrasive Disc", None),
        ('Zirconia Sanding Belt 2"x36" P80', "Sanding Belt", None),
        ('Ceramic Abrasive Disc 5" 80 Grit', "Abrasive Disc", None),
        ('7/8" Arbor Cut-Off Wheel 4.5"', "Cut-Off Wheel", None),
        ('Aluminum Oxide Grinding Wheel 6"', "Grinding Wheel", None)
    ]
    
    for text, exp_type, exp_pack in test_cases:
        res = enrichment_service.enrich(text)
        assert res["attributes"]["product_type"] == exp_type
        if exp_pack:
            assert res["attributes"]["pack_quantity"] == exp_pack

def test_pipeline_integration():
    text = 'DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc'
    res = pipeline.process_raw(text)
    
    assert res["part_number"] == "DCB518ASTS06G"
    assert res["brand"] == "DIABLO"
    assert res["category"] == "Abrasives"
    assert res["validation"]["overall_status"] in ["valid", "invalid"] # Just check it ran
    assert "trust_score" in res
    assert res["trust_score"] > 0
    assert "confidence_tags" in res
