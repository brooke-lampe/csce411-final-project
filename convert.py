from random import randint
import csv

def getPeople():
    people = list()
    file = open('medical_data.csv', 'r')
    reader = csv.reader(file)
    line_count = 0
    for line in reader: 
        if line_count == 0: 
            line_count += 1
        else:
            people.append(int(line[0]))
            line_count += 1
    return people

def getDiseases():
    diseases = list()
    file = open('diseases.csv', 'r')
    reader = csv.reader(file)
    line_count = 0
    for line in reader: 
        if line_count == 0: 
            line_count += 1
        else:
            diseases.append(int(line[0]))
            line_count += 1
    return diseases


def generateDiseases():
    people = getPeople()
    diseases = getDiseases()
    disease_file = open("has_disease.csv", "w")
    writer = csv.writer(disease_file)
    writer.writerow(['disease_relationship_id', 'person_id', 'disease_id'])
    id = 0
    for person in people: 
        number = randint(0, 5)
        for x in range(0, number):
            disease_id = randint(0, len(diseases))
            writer.writerow([id, person, disease_id])
            id += 1


generateDiseases()

