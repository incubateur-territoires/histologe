<?php

namespace App\Repository;

use App\Entity\Affectation;
use App\Entity\Partenaire;
use App\Entity\Signalement;
use App\Entity\Suivi;
use App\Entity\User;
use App\Service\SearchFilterService;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\Query\Expr\Join;
use Doctrine\ORM\Query\ResultSetMapping;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * @method Signalement|null find($id, $lockMode = null, $lockVersion = null)
 * @method Signalement|null findOneBy(array $criteria, array $orderBy = null)
 * @method Signalement[]    findAll()
 * @method Signalement[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class SignalementRepository extends ServiceEntityRepository
{
    const ARRAY_LIST_PAGE_SIZE = 30;
    const MARKERS_PAGE_SIZE = 300;

    private SearchFilterService $searchFilterService;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Signalement::class);
        $this->searchFilterService = new SearchFilterService();
    }

    public function findAllWithGeoData($user, $options, int $offset)
    {
        $firstResult = ($offset !== 0 ? $offset : self::MARKERS_PAGE_SIZE) - self::MARKERS_PAGE_SIZE;
        $qb = $this->createQueryBuilder('s');
        $qb->select('PARTIAL s.{id,details,uuid,reference,nomOccupant,prenomOccupant,adresseOccupant,cpOccupant,villeOccupant,scoreCreation,statut,createdAt,geoloc},
            PARTIAL a.{id,partenaire,createdAt},
            PARTIAL criteres.{id,label},
            PARTIAL partenaire.{id,nom}');

        $qb->leftJoin('s.affectations', 'a');
        $qb->leftJoin('s.criteres', 'criteres')
            ->leftJoin('a.partenaire', 'partenaire');
        if ($user)
            $qb->andWhere('partenaire = :partenaire')->setParameter('partenaire', $user->getPartenaire());
        $qb = $this->searchFilterService->applyFilters($qb, $options);
        $qb->addSelect('a', 'partenaire',  'criteres');
        $qb->groupBy('s.id');
        return $qb->andWhere("JSON_EXTRACT(s.geoloc,'$.lat') != ''")
            ->andWhere("JSON_EXTRACT(s.geoloc,'$.lng') != ''")
            ->andWhere('s.statut != 7')
            ->setFirstResult($firstResult)
            ->setMaxResults(self::MARKERS_PAGE_SIZE)
            ->getQuery()->getArrayResult();
    }

    public function findAllWithAffectations($year)
    {
        return $this->createQueryBuilder('s')
            ->where('s.statut != 7')
            ->andWhere('YEAR(s.createdAt) = ' . $year)
            ->leftJoin('s.affectations', 'affectations')
            ->addSelect('affectations', 's')
            ->getQuery()
            ->getResult();
    }

    public function countByStatus()
    {
        $qb = $this->createQueryBuilder('s');
        $qb->select('COUNT(s.id) as count')
            ->addSelect('s.statut');
        $qb->indexBy('s', 's.statut');
        $qb->groupBy('s.statut');
        return $qb->getQuery()
            ->getResult();
    }

    public function countByCity()
    {
        $qb = $this->createQueryBuilder('s');
        $qb->select('COUNT(s.id) as count')
            ->addSelect('s.villeOccupant');
        $qb->indexBy('s', 's.villeOccupant');
        $qb->groupBy('s.villeOccupant');
        return $qb->getQuery()
            ->getResult();
    }

    /**
     * @throws NonUniqueResultException
     */
    public function findByUuid($uuid)
    {
        $qb = $this->createQueryBuilder('s')
            ->where('s.uuid = :uuid')
            ->setParameter('uuid', $uuid);
        $qb
            ->leftJoin('s.situations', 'situations')
            ->leftJoin('s.affectations', 'affectations')
            ->leftJoin('situations.criteres', 'criteres')
            ->leftJoin('criteres.criticites', 'criticites')
            ->leftJoin('affectations.partenaire', 'partenaire')
            ->addSelect('situations', 'affectations', 'criteres', 'criticites', 'partenaire');
        return $qb->getQuery()->getOneOrNullResult();
    }

    public function findByStatusAndOrCityForUser(User|UserInterface $user = null, array $options, int|null $export)
    {

        $pageSize = $export ?? self::ARRAY_LIST_PAGE_SIZE;
        $firstResult = (($options['page'] ?? 1) - 1) * $pageSize;
        $qb = $this->createQueryBuilder('s');
        if (!$export)
            $qb->select('PARTIAL s.{id,uuid,reference,nomOccupant,prenomOccupant,adresseOccupant,cpOccupant,villeOccupant,scoreCreation,statut,createdAt,geoloc}');

        $qb->where('s.statut != :status')
            ->setParameter('status', Signalement::STATUS_ARCHIVED);
        $qb->leftJoin('s.affectations', 'a');
        $qb->leftJoin('a.partenaire', 'partenaire');
        $qb->leftJoin('s.suivis', 'suivis');
        $qb->leftJoin('suivis.createdBy', 'suivi_creator');
        $qb->leftJoin('suivi_creator.partenaire', 'suivi_creator_partenaire');
        $qb->leftJoin('s.criteres', 'criteres');
        $qb->addSelect('a', 'partenaire', 'suivis', 'suivi_creator');
        $qb = $this->searchFilterService->applyFilters($qb, $options);
        $qb->orderBy('s.createdAt', 'DESC')
            ->setFirstResult($firstResult)
            ->setMaxResults($pageSize)
            ->getQuery();
        return new Paginator($qb, true);
    }

    public
    function findCities($user = null): array|int|string
    {
        $qb = $this->createQueryBuilder('s')
            ->select('s.villeOccupant city')
            ->where('s.statut != :status')
            ->setParameter('status', Signalement::STATUS_ARCHIVED);
        if ($user)
            $qb->leftJoin('s.affectations', 'affectations')
                ->leftJoin('affectations.partenaire', 'partenaire')
                ->andWhere('partenaire = :partenaire')
                ->setParameter('partenaire', $user->getPArtenaire());
        return $qb->groupBy('s.villeOccupant')
            ->getQuery()
            ->getResult();
    }


    public
    function findOneByCodeForPublic($code): ?Signalement
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.codeSuivi = :code')
            ->setParameter('code', $code)
            ->leftJoin('s.suivis', 'suivis', Join::WITH, 'suivis.isPublic = 1')
            ->addSelect('suivis')
            ->getQuery()
            ->getOneOrNullResult();
    }

}
